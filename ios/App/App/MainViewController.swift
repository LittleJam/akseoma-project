import UIKit
import WebKit
import AVFoundation
import Capacitor

// WKWebView не даёт системный жест «смахнуть от края — назад» по умолчанию.
// allowsBackForwardNavigationGestures здесь не подошёл: он идёт по
// WKBackForwardList, а его наполнение для SPA на pushState (как это
// приложение) ведёт себя не всегда предсказуемо.
// Вместо этого — свой распознаватель жеста у левого края экрана. Вместо
// одного вызова window.history.back() по завершении жеста — прогресс уходит
// в JS на каждое движение пальца (см. utils/nativeSwipe.js), и открытое окно
// едет следом в реальном времени, открывая то, что под ним. Отпустили дальше
// половины экрана или резким движением — закрываем взаправду; иначе окно
// едет обратно на место.
// Висит на self.view, а не на scrollView внутри WKWebView: у веб-контента
// свой собственный жест прокрутки, и без разрешения на одновременное
// распознавание он побеждал бы наш каждый раз, даже у самого края
class MainViewController: CAPBridgeViewController, UIGestureRecognizerDelegate {
    // Полосу, которая открывается внизу, когда клавиатура уводит страницу
    // вверх, красит не страница, а само веб-вью. Цвет ему ставит Capacitor из
    // capacitor.config — один на всё приложение, — поэтому в тёмной теме там
    // светилась белая полоса светлой темы.
    //
    // underPageBackgroundColor WebKit выводит из фона страницы (фон задан на
    // html, см. index.css), то есть он уже знает цвет текущей темы. Остаётся
    // повторить его везде, где этот низ виден. Наблюдение — на случай смены
    // темы на ходу, плюс отдельная сверка перед самым показом клавиатуры:
    // именно в этот момент полоса и появляется
    private var pageBackgroundObserver: NSKeyValueObservation?

    // Музыка на вкладке Chill — YouTube-плеер, спрятанный от глаз, звук без
    // видео. Плеер живёт во вложенном (чужого происхождения) iframe, и
    // команда playVideo() до него доходит через postMessage из клика
    // пользователя — WebKit такую цепочку «настоящим» жестом не всегда
    // считает. mediaTypesRequiringUserActionForPlayback здесь снят совсем:
    // это единственное место, где политику ставят ДО того, как появится
    // хоть какой-то контент, в том числе вложенный
    override func webViewConfiguration(for instanceConfiguration: InstanceConfiguration) -> WKWebViewConfiguration {
        let configuration = super.webViewConfiguration(for: instanceConfiguration)
        configuration.mediaTypesRequiringUserActionForPlayback = []
        configuration.allowsInlineMediaPlayback = true
        configuration.allowsAirPlayForMediaPlayback = true
        return configuration
    }

    override func capacitorDidLoad() {
        // Без этого веб-звук (что видео, что Web Audio API — источник неважен)
        // подчиняется боковому беззвучному переключателю на самом устройстве,
        // как в обычном Safari. .playback игнорирует его: звук в приложении
        // для музыки/таймера ожидаемо слышен всегда, а не только когда
        // переключатель отведён в положение «со звуком»
        do {
            try AVAudioSession.sharedInstance().setCategory(.playback, mode: .default, options: [.mixWithOthers])
            try AVAudioSession.sharedInstance().setActive(true)
        } catch {
            print("AVAudioSession configuration error: \(error)")
        }

        // Веб-вью не прокручивается никогда: все прокрутки в приложении живут
        // во внутренних контейнерах (см. PageShell), а #root высотой ровно в
        // экран. Собственная прокрутка нужна только самому WebKit — показать
        // курсор из-под клавиатуры, — и делает он это, утаскивая видимую
        // область вместе со всем position: fixed: открытая заметка уезжала
        // целиком, вместе с шапкой. Курсор к клавиатуре подводит сама заметка
        // (см. utils/caretScroll.js)
        webView?.scrollView.isScrollEnabled = false

        syncPageBackground()
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(syncPageBackground),
            name: UIResponder.keyboardWillShowNotification,
            object: nil
        )
        if #available(iOS 15.0, *), let webView = webView {
            pageBackgroundObserver = webView.observe(\.underPageBackgroundColor, options: [.new]) { [weak self] _, _ in
                self?.syncPageBackground()
            }
        }

        let edgeSwipe = UIScreenEdgePanGestureRecognizer(target: self, action: #selector(handleEdgeSwipeBack(_:)))
        edgeSwipe.edges = .left
        edgeSwipe.delegate = self
        view.addGestureRecognizer(edgeSwipe)
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        // Только теперь вью лежит в окне: до этого красить окну было нечем
        syncPageBackground()
    }

    @objc private func syncPageBackground() {
        guard let webView = webView else { return }

        // underPageBackgroundColor бывает пустым — например, пока страница ещё
        // не отрисовалась. Присвоить nil значит сделать вью прозрачным, а из-под
        // него смотрит чёрное окно: это и был чёрный прямоугольник, который
        // видно под клавиатурой, пока она выезжает, а веб-вью уже ужался
        var color = webView.backgroundColor
        if #available(iOS 15.0, *), let page = webView.underPageBackgroundColor {
            color = page
        }
        guard let resolved = color else { return }

        webView.backgroundColor = resolved
        webView.scrollView.backgroundColor = resolved
        // Клавиатура ужимает веб-вью (плагин Keyboard, resize: native), и на
        // время её выезда между нижним краем веб-вью и самой клавиатурой видно
        // то, что лежит под ними: вью контроллера, а за ним окно
        view.backgroundColor = resolved
        view.window?.backgroundColor = resolved
    }

    deinit {
        pageBackgroundObserver?.invalidate()
        NotificationCenter.default.removeObserver(self)
    }

    func gestureRecognizer(
        _ gestureRecognizer: UIGestureRecognizer,
        shouldRecognizeSimultaneouslyWith otherGestureRecognizer: UIGestureRecognizer
    ) -> Bool {
        true
    }

    @objc private func handleEdgeSwipeBack(_ gesture: UIScreenEdgePanGestureRecognizer) {
        guard let webView = webView, let gestureView = gesture.view, gestureView.bounds.width > 0 else { return }

        let translationX = gesture.translation(in: gestureView).x
        let progress = max(0, min(1, translationX / gestureView.bounds.width))

        switch gesture.state {
        case .changed:
            webView.evaluateJavaScript("window.__edgeSwipeProgress && window.__edgeSwipeProgress(\(progress));")

        case .ended:
            let velocityX = gesture.velocity(in: gestureView).x
            let shouldCommit = progress > 0.4 || velocityX > 900
            let js = shouldCommit
                ? "window.__edgeSwipeCommit && window.__edgeSwipeCommit();"
                : "window.__edgeSwipeCancel && window.__edgeSwipeCancel();"
            webView.evaluateJavaScript(js)

        case .cancelled, .failed:
            webView.evaluateJavaScript("window.__edgeSwipeCancel && window.__edgeSwipeCancel();")

        default:
            break
        }
    }
}
